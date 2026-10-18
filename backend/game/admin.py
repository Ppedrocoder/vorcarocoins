from django.contrib import admin
from .models import Bet, Election, NewsItem, Player, Purchase

admin.site.register([Player, Bet, Election, Purchase])


@admin.register(NewsItem)
class NewsItemAdmin(admin.ModelAdmin):
    list_display = ("title", "source", "published_at")
